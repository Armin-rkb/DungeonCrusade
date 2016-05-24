using UnityEngine;
using System.Collections;

public class Shuriken : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbShuriken;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private int damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;
    private bool isRight;
    private bool isLeft;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Shuriken);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Shuriken);
    }

    void FixedUpdate()
    {
        if (isRight)
            rbShuriken.velocity = new Vector2(speed, rbShuriken.velocity.y);
        else if (isLeft)
            rbShuriken.velocity = new Vector2(-speed, rbShuriken.velocity.y);
    }

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage, true);
        //Give the player knockback
        //Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        //rbPlayer.isKinematic = true;
        //rbPlayer.AddForce((rbShuriken.position - rbPlayer.position).normalized * -knockback);
        //rbPlayer.isKinematic = false;
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
            else
            {
                isRight = false;
                isLeft = false;
                rbShuriken.isKinematic = true;
                gameObject.AddComponent<Fade>();
            }

        }
    }
}
