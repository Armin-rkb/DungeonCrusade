using UnityEngine;
using System.Collections;

public class Pill : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbPill;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private float damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;
    //How long the bullet will stay
    private float lifeTime = 150f;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.pill);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.pill);
    }

    void FixedUpdate()
    {
        lifeTime--;

        if (isRight)
        {
            rbPill.AddForce(Vector2.right * speed, ForceMode2D.Impulse);
            isRight = false;
        }

        else if (isLeft)
        {
            rbPill.AddForce(-Vector2.right * speed, ForceMode2D.Impulse);
            isLeft = false;
        }

        if (bounce)
        {
            rbPill.velocity = new Vector2(rbPill.velocity.x, speed + speed);
            bounce = false;
        }

        if (lifeTime < 0)
            gameObject.AddComponent<Fade>();
    }

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage);
        //Give the player knockback
        //Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        //rbPlayer.AddForce((rbPill.position - rbPlayer.position).normalized * -knockback);
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                Destroy(this.gameObject);
            }

            else if (coll.gameObject.CompareTag(GameTags.ground))
                bounce = true;

            else if (!coll.gameObject.CompareTag(GameTags.ground))
                gameObject.AddComponent<Fade>();
        }
    }
}