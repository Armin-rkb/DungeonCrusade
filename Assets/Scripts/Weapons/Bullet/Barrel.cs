using UnityEngine;
using System.Collections;

public class Barrel : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbBarrel;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private int damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;
    //The broken sprite.
    [SerializeField] private GameObject brokenBullet;
    //How long the bullet will stay
    private float lifeTime = 150f;
    private bool isRight;
    private bool isLeft;


    public int playernum;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Barrel);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Barrel);
    }

    void FixedUpdate()
    {
        lifeTime--;

        if (isRight)
            rbBarrel.velocity = new Vector2(speed, rbBarrel.velocity.y);
        else if (isLeft)
            rbBarrel.velocity = new Vector2(-speed, rbBarrel.velocity.y);

        if (lifeTime < 0)
        {
            Instantiate(brokenBullet, transform.position, transform.rotation);
            Destroy(this.gameObject);
        }
    }

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage, true);
        //Give the player knockback
        PlayerMovement playerMovement = player.GetComponent<PlayerMovement>();
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        Vector2 currPosition = (rbBarrel.position - rbPlayer.position).normalized;
        float xPos = currPosition.x * knockback;
        playerMovement.ApplyKnockback(xPos);
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                Instantiate(brokenBullet, transform.position, transform.rotation);
                Destroy(this.gameObject);
            }

            else if (!coll.gameObject.CompareTag(GameTags.ground))
            {
                Instantiate(brokenBullet, transform.position, transform.rotation);
                Destroy(this.gameObject);
            }
        }
    }
}
