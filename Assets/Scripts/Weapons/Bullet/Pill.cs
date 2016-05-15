using UnityEngine;
using System.Collections;

public class Pill : MonoBehaviour
{
    [SerializeField] private Rigidbody2D rbPill;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private float damage;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
    }

    void FixedUpdate()
    {
        if (isRight)
            rbPill.velocity = new Vector2(speed, rbPill.velocity.y);
        else if (isLeft)
            rbPill.velocity = new Vector2(-speed, rbPill.velocity.y);

        if (bounce)
        {
            rbPill.velocity = new Vector2(rbPill.velocity.x, speed);
            bounce = false;
        }
    }

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage);
        //Give the player knockback
        Rigidbody2D rb = player.GetComponent<Rigidbody2D>();
        rb.AddForce(player.transform.right * 500);
        print("push");
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.tag == "Player")
            {
                Hit(coll.gameObject);
                Destroy(this.gameObject);
            }

            else if (coll.gameObject.tag == "Ground")
            {
                bounce = true;
            }

            else
                Destroy(this.gameObject);
        }
    }
}
