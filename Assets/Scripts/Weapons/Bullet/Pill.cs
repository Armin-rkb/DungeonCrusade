using UnityEngine;
using System.Collections;

public class Pill : MonoBehaviour
{
    //Rigidbody of the Gameobject
    private Rigidbody2D rbPill;
    //Sprite of this bullet
    private SpriteRenderer sprite;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private float damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    void Awake()
    {
        rbPill = GetComponent<Rigidbody2D>();
        sprite = GetComponent<SpriteRenderer>();
    }

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
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        rbPlayer.AddForce((rbPill.position - rbPlayer.position).normalized * -knockback);
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
            }

            else
                Destroy(this.gameObject);
        }
    }