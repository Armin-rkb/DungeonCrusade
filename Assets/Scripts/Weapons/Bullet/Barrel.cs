using UnityEngine;
using System.Collections;

public class Barrel : MonoBehaviour
{
    //Rigidbody of the Gameobject
    private Rigidbody2D rbBarrel;
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

    void Awake()
    {
        rbBarrel = GetComponent<Rigidbody2D>();
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
            rbBarrel.velocity = new Vector2(speed, rbBarrel.velocity.y);
        else if (isLeft)
            rbBarrel.velocity = new Vector2(-speed, rbBarrel.velocity.y);

        //CheckWall();
    }

    //Test remover
    /*
    void CheckWall()
    {
        float XDirection = (rbBarrel.position.x) - (transform.position.x);
        float YDirection = (rbBarrel.position.y) - (transform.position.y);
        Ray position = new Ray(transform.position, new Vector2(XDirection, YDirection));
        RaycastHit2D hit = Physics2D.Raycast(position.origin, position.direction, 0.5f);

        Debug.DrawRay(transform.position, position.direction);
        
        if (hit.collider != null)
        {
            if (hit.collider.tag != "Ground")
                Destroy(this.gameObject);
        }
    }
    */

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage);
        //Give the player knockback
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        rbPlayer.AddForce((rbBarrel.position - rbPlayer.position).normalized * -knockback);
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

            else if (!coll.gameObject.CompareTag(GameTags.ground))
            {
                isRight = false;
                isLeft = false;
                rbBarrel.isKinematic = true;
                gameObject.AddComponent<Fade>();
            }
        }
    }
}
